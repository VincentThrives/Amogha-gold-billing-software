package com.vincent.amogha.modules.user;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByPhoneAndRole(String phone, String role);
    Optional<User> findByPhone(String phone);
    List<User> findByRole(String role);
}
