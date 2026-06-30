package com.vincent.amogha.modules.settings;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface CompanyRepository extends MongoRepository<Company, String> {
}
