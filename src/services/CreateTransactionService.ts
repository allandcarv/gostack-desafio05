// import AppError from '../errors/AppError';
import { getRepository } from 'typeorm';

import Category from '../models/Category';
import Transaction from '../models/Transaction';
import AppError from '../errors/AppError';

interface Request {
  title: string;

  value: number;

  type: 'income' | 'outcome';

  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getRepository(Transaction);

    const hasCategory = await categoriesRepository.findOne({
      where: { title: category },
    });

    const balance = await transactionsRepository.find({
      select: ['type', 'value'],
    });

    const checkBalance = balance.reduce((final, current) => {
      if (current.type === 'income') {
        final += Number(current.value);
      }

      if (current.type === 'outcome') {
        final -= Number(current.value);
      }

      return final;
    }, 0);

    if (type === 'outcome' && value > checkBalance) {
      throw new AppError('You cannot afford this transaction', 400);
    }

    let category_id: string;

    if (!hasCategory) {
      const newCategory = categoriesRepository.create({ title: category });
      await categoriesRepository.save(newCategory);
      category_id = newCategory.id;
    } else {
      category_id = hasCategory.id;
    }

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category_id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
