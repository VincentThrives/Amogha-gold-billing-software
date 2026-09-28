package com.vincent.amogha.modules.ledger;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ExpenseCategoryRepository extends MongoRepository<ExpenseCategory, String> {
    List<ExpenseCategory> findAllByOrderByNameAsc();
    Optional<ExpenseCategory> findByNameIgnoreCase(String name);
}
