package com.vincent.amogha.modules.feature;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface FeatureRepository extends MongoRepository<FeatureFlags, String> {
}
