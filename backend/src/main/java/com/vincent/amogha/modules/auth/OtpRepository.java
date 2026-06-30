package com.vincent.amogha.modules.auth;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface OtpRepository extends MongoRepository<Otp, String> {
}
