# 0007. Franchise hierarchy and commission lifecycle

## Status

Accepted

## Decision

Franchises are represented by one executive user and receive exactly one exclusive territory at
one of four levels: state, parliamentary constituency, assembly constituency, or area/pincode.
Territories can overlap across levels, so one sale can generate basic commission for the matching
area, assembly, parliamentary and state franchises.

State basic commission defaults to 1% (100 basis points); every other level defaults to 5% (500
basis points). Additional commission defaults to 10% (1,000 basis points) and applies only when
that franchise user closes the sale. Commission is expected until both the job is completed and
its proforma invoice is fully paid, then becomes earned.

Electoral master data stores source URL/version. The official ECI PC/AC hierarchy and India Post
pincode directory are separate sources and do not provide a canonical national pincode-to-
constituency crosswalk. `pincode_constituencies` is therefore an imported, reviewable bridge with
admin CRUD/manual override support. Bulk imports never overwrite a manual override.

Legacy `staff_pincode_allocations` remain readable for migration compatibility, but new franchise
territory assignment and visibility use `franchise_territories`.
