import { getRepository } from 'typeorm';
import { join } from 'path';
import fs from 'fs';
import csvToJson from 'csvtojson';

import Category from '../models/Category';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import AppError from '../errors/AppError';

interface Request {
  filename: string;
}

class ImportTransactionsService {
  async execute({ filename }: Request): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getRepository(Transaction);

    const filePath = join(uploadConfig.directory, filename);

    const file = await fs.promises.stat(filePath);

    if (!file) {
      throw new AppError('File not found', 400);
    }

    const converter = await csvToJson().fromFile(filePath);
    const extractedCategories = converter.reduce((final, current) => {
      if (!final.includes(current.category)) {
        final.push(current.category);
      }

      return final;
    }, []);

    const categories: Category[] = await Promise.all(
      extractedCategories.map(
        async (categoryTitle: string): Promise<Category> => {
          const category = await categoriesRepository.findOne({
            where: { title: categoryTitle },
          });

          if (!category) {
            const newCategory = categoriesRepository.create({
              title: categoryTitle,
            });

            await categoriesRepository.save(newCategory);

            return newCategory;
          }

          return category;
        },
      ),
    );

    const transactions = transactionsRepository.create(
      converter.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: categories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    if (transactions.length) {
      await transactionsRepository.save(transactions);
    }

    await fs.promises.unlink(filePath);

    return transactions;
  }
}

export default ImportTransactionsService;
