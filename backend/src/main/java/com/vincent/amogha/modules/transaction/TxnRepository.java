package com.vincent.amogha.modules.transaction;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TxnRepository extends MongoRepository<Txn, String> {
    List<Txn> findAllByOrderByDateDesc();
}
