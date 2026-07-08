package com.vincent.amogha.modules.ledger;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ExpenseRepository extends MongoRepository<Expense, String> {
    List<Expense> findAllByOrderByDateDesc();
}
