package com.vincent.amogha.modules.fund;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface FundRepository extends MongoRepository<FundRequest, String> {
    List<FundRequest> findAllByOrderByRequestedAtDesc();
    List<FundRequest> findByEmployeeIdOrderByRequestedAtDesc(String employeeId);
}
