
"""
Homogenity metric:

Racial demographics of a region S:
RD(S)[r] = E_{q in S} (R(q) == r)

H(S) = E_{p in S} E_{q in n(p)} sum_r (R(p) == r) (R(q) == r)
     = (sum_{b in S} |b| E_{p in b} E_{q in n(p)} sum_r (R(p) == r) (R(q) == r)) / sum_{b in S} |b|
     = (sum_{b in S} |b| H(b)) / |S|
     = E_{b in S} H(b)

H(b) = 1 / |b| sum_{p in b} E_{q in n(p)} sum_r (R(p) == r) (R(q) == r)
     = 1 / |b| sum_{p in b} sum_r (R(p) == r) RD(n(p))[r]
     = sum_r RD(p)[r] RD(n(p))[r]
     = RD(p)^T RD(n(p))

So H(S) can be written as
H(S) = E_{b in S} [v_b^T u_b]
    where v_b = RD(b) and u_b = RD(n(b))
    let w_b = u_b - v_b, which must also be positive in every entry

E_x[v_x^T u_x] - E_x[v_x]^T E_x[u_x]
    = E_x[v_x^T v_x] + E_x[v_x^T w_x] - E_x[v_x]^T E_x[v_x] - E_x[v_x]^T E_x[w_x]
    = Var(v_x) + Cov(v_x, w_x)
"""