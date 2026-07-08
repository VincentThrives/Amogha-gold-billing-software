package com.vincent.amogha.modules.ledger;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AdminFundRepository extends MongoRepository<AdminFund, String> {
    List<AdminFund> findAllByOrderByDateDesc();
}
