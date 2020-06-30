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

    const categories: Category[] = await Promise.all(
      converter.map(
        async (transaction): Promise<Category> => {
          const category = await categoriesRepository.findOne({
            where: { title: transaction.category },
          });

          if (!category) {
            const newCategory = categoriesRepository.create({
              title: transaction.category,
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

    return transactions;
  }
}

export default ImportTransactionsService;
