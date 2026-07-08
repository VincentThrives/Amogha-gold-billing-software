package com.vincent.amogha.modules.transaction;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document("transactions")
public class Txn {
    @Id public String id;
    public String billNo;
    public String date;          // ISO timestamp
    public String metal;         // gold | silver
    public String employeeId;
    public String employeeName;
    public Customer customer;
    public List<IdProof> idProofs;
    public Reference reference;
    public String selfie;        // data URL or null
    public boolean clientOtpVerified;
    public String article;
    public List<TxnItem> items;
    public Totals totals;
    public String releaseMethod; // Cash | RTGS | NEFT | UPI | IMPS | Cheque (when release amount > 0)
    public String releaseBank;   // bank the release amount was paid to
    public String status;        // pending | approved | rejected
    public String approvedBy;    // admin user id
    public String approvedAt;    // ISO timestamp
    public boolean deleted;      // soft-deleted → shown only in the recycle bin
    public String deletedAt;
    public String deletedBy;

    public static class Customer {
        public String name;
        public String dob;
        public String phone;
        public String address1;
        public String address2;
        public String pincode;
        public String landmark;
    }

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

    public static class TxnItem {
        public String article;
        public double gross;
        public double stone;
        public double other;
        public double net;
        public double purity;
        public double rate;
        public double amount;
    }

    public static class Totals {
        public double grossAmount;
        public double margin;
        public double netAmount;
        public double billingCharges;
        public double releaseAmount;  // paid to the bank to release the customer's gold
        public long amountPayable;    // rounded rupees, net to the customer
        public double netWeight;
    }
}
