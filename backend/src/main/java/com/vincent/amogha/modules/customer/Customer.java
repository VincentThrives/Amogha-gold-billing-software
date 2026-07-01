package com.vincent.amogha.modules.customer;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

/** A registered customer (KYC only, no bill). Keyed uniquely by phone. */
@Document("customers")
public class Customer {
    @Id public String id;
    public String name;
    public String dob;
    @Indexed(unique = true) public String phone;
    public String address1;
    public String address2;
    public String pincode;
    public String landmark;
    public List<IdProof> idProofs;
    public Reference reference;
    public String selfie;        // data URL or null
    public String createdAt;     // ISO timestamp
    public String createdBy;     // user id

    public static class IdProof {
        public String type;
        public String number;
    }

    public static class Reference {
        public String number;
        public String relationship;
        public String phone;
        public String address;
    }
}
