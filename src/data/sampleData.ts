/** Synthetic data only: every value below is made up or a public test number. */

export const SAMPLE_TEXT = `2025-11-27 10:42:13 INFO  [ticket #48213] Customer Rahul Sharma <rahul.sharma@example.com> reported a failed payment.
2025-11-27 10:42:15 WARN  src_ip=192.168.10.45 ipv6=2001:db8:85a3::8a2e:370:7334 gateway timeout (retry 2)
2025-11-27 10:42:19 INFO  Card on file: 4111 1111 1111 1111 (exp 12/28), order id 1234567812345678
2025-11-27 10:43:02 INFO  Customer called from +91 98765 43210, alt +1 (415) 555-2671
2025-11-27 10:43:40 NOTE  KYC: PAN ABCDE1234F, Aadhaar 2345 6789 0124
2025-11-27 10:44:05 NOTE  Second KYC attempt, Aadhaar 2345 6789 0123 (typo?), PAN ABCDE1234F
2025-11-27 10:45:11 ERROR bad address 999.1.1.1 rejected; fallback 10.0.0.7 and ::1
2025-11-27 10:46:27 INFO  Refund to 5500-0000-0000-0004 initiated; receipt sent to RAHUL.SHARMA@example.com
2025-11-27 10:47:00 INFO  Amex 378282246310005 declined. Transaction ref 9876543210123456.
2025-11-27 10:48:33 INFO  Escalated to priya.nair@corp.in, phone 09876543210, from 192.168.10.45
`;

export const SAMPLE_CSV = `ticket_id,customer,email,phone,card,pan,aadhaar,ip,notes
48213,Rahul Sharma,rahul.sharma@example.com,+91 98765 43210,4111 1111 1111 1111,ABCDE1234F,2345 6789 0124,192.168.10.45,"Failed payment, retried twice"
48214,Priya Nair,priya.nair@corp.in,09876543210,5500-0000-0000-0004,FGHIJ5678K,4987 6543 2102,10.0.0.7,"Order 1234567812345678 not a card"
48215,Rahul Sharma,RAHUL.SHARMA@example.com,+1 (415) 555-2671,378282246310005,ABCDE1234F,2345 6789 0124,2001:db8::1,Duplicate customer
`;
