package com.vincent.amogha.modules.transaction;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface TxnRepository extends MongoRepository<Txn, String> {
    // Exclude the base64 selfie image at the DB level — the list view never shows it,
    // and loading tens of MB of images per /api/state made the endpoint slow. The selfie
    // is fetched per-transaction where needed. (sort kept as date desc.)
    @Query(value = "{}", fields = "{ 'selfie' : 0 }", sort = "{ 'date' : -1 }")
    List<Txn> findAllByOrderByDateDesc();
}
