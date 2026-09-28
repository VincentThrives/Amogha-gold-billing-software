package com.vincent.amogha.modules.customer;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends MongoRepository<Customer, String> {
    Optional<Customer> findFirstByPhone(String phone);

    // Exclude the base64 selfie image at the DB level (see TxnRepository). The full
    // customer incl. selfie is available via CustomerController.get (findById).
    @Query(value = "{}", fields = "{ 'selfie' : 0 }", sort = "{ 'createdAt' : -1 }")
    List<Customer> findAllByOrderByCreatedAtDesc();
}
