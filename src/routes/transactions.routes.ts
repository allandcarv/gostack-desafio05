import { Router } from 'express';
import { getRepository } from 'typeorm';
import multer from 'multer';

// import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import DeleteTransactionService from '../services/DeleteTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';

import Transaction from '../models/Transaction';

import uploadConfig from '../config/upload';

const transactionsRouter = Router();
const upload = multer(uploadConfig);

transactionsRouter.get('/', async (request, response) => {
  const transactionsRepository = getRepository(Transaction);

  const transactions = await transactionsRepository.find({
    relations: ['category'],
    select: [
      'id',
      'title',
      'value',
      'type',
      'category',
      'created_at',
      'updated_at',
    ],
  });

  const balance = transactions.reduce(
    (accumulator, current) => {
      if (current.type === 'income') {
        accumulator.income += Number(current.value);
      }

      if (current.type === 'outcome') {
        accumulator.outcome += Number(current.value);
      }

      accumulator.total = accumulator.income - accumulator.outcome;

      return accumulator;
    },
    {
      income: 0.0,
      outcome: 0.0,
      total: 0.0,
    },
  );

  return response.json({ transactions, balance });
});

transactionsRouter.post('/', async (request, response) => {
  const { title, value, type, category } = request.body;

  const createTransaction = new CreateTransactionService();

  const transaction = await createTransaction.execute({
    title,
    value,
    type,
    category,
  });

  return response.status(201).json(transaction);
});

transactionsRouter.delete('/:id', async (request, response) => {
  const { id } = request.params;

  const deleteTransaction = new DeleteTransactionService();

  await deleteTransaction.execute({ id });

  return response.status(204).send();
});

transactionsRouter.post(
  '/import',
  upload.single('file'),
  async (request, response) => {
    const importTransaction = new ImportTransactionsService();

    const transactions = await importTransaction.execute({
      filename: request.file.filename,
    });

    return response.json(transactions);
  },
);

export default transactionsRouter;
