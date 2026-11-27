/**
 * Synthetic data only: every value below is made up or a public test number.
 * Framed as support material someone wants to scrub before pasting into an LLM
 * or sending to a vendor.
 */

export const SAMPLE_TEXT = `# Support escalation #48213: DRAFT, contains customer data. Scrub before sending to the vendor / pasting into an LLM.
2025-11-27 10:42:13 INFO  [ticket #48213] Customer Rahul Sharma <rahul.sharma@example.com> reported a failed payment.
2025-11-27 10:42:15 WARN  src_ip=192.168.10.45 ipv6=2001:db8:85a3::8a2e:370:7334 gateway timeout (retry 2)
2025-11-27 10:42:19 INFO  Card on file: 4111 1111 1111 1111 (exp 12/28), internal order id 1234567812345678
2025-11-27 10:43:02 INFO  Customer called from +91 98765 43210, alt +1 (415) 555-2671
2025-11-27 10:43:40 NOTE  KYC: PAN ABCPE1234F, Aadhaar 2345 6789 0124
2025-11-27 10:44:05 NOTE  Second KYC attempt, Aadhaar 2345 6789 0123 (typo?), PAN ABCPE1234F
2025-11-27 10:45:11 ERROR bad address 999.1.1.1 rejected; fallback 10.0.0.7 and ::1
2025-11-27 10:46:27 INFO  Refund to 5500-0000-0000-0004 initiated; receipt sent to RAHUL.SHARMA@example.com
2025-11-27 10:47:00 INFO  Amex 378282246310005 declined. Transaction ref 9876543210123456.
2025-11-27 10:48:33 INFO  Escalated to priya.nair@corp.in, phone 09876543210, from 192.168.10.45
Question for the vendor: why does the retry from 192.168.10.45 keep timing out for this customer?
`;

export const SAMPLE_CSV = `ticket_id,customer,email,phone,card,pan,aadhaar,ip,notes
48213,Rahul Sharma,rahul.sharma@example.com,+91 98765 43210,4111 1111 1111 1111,ABCPE1234F,2345 6789 0124,192.168.10.45,"Failed payment, retried twice (export for vendor review)"
48214,Priya Nair,priya.nair@corp.in,09876543210,5500-0000-0000-0004,FGHCJ5678K,4987 6543 2102,10.0.0.7,"Order 1234567812345678 is an internal ID, not a card"
48215,Rahul Sharma,RAHUL.SHARMA@example.com,+1 (415) 555-2671,378282246310005,ABCPE1234F,2345 6789 0124,2001:db8::1,Duplicate customer record
`;

/** Short input for the "How it works" section; its outputs are pinned by a test. */
export const HOW_IT_WORKS_EXAMPLE =
  'Reach Jane at jane.doe@acme.com or +91 98765 43210. Card 4111 1111 1111 1111 (again: jane.doe@acme.com).';
