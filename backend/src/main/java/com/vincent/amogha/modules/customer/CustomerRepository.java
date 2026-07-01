package com.vincent.amogha.modules.customer;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends MongoRepository<Customer, String> {
    Optional<Customer> findFirstByPhone(String phone);
    List<Customer> findAllByOrderByCreatedAtDesc();
}
