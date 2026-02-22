import unittest

from parameterized import parameterized

from urbanstats.website_data.shard_index_rounding import round_shard_index_hashes


class TestRoundShardIndexHashes(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(round_shard_index_hashes([]), [])

    def test_single(self):
        self.assertEqual(round_shard_index_hashes([0]), [0])
        # Single value rounded down as much as possible (k=31).
        self.assertEqual(round_shard_index_hashes([0x12345678]), [0])

    def test_two_no_rounding_possible(self):
        # Adjacent values: 0 and 1. (1>>k) > (0>>k) only for k=0. So no rounding.
        self.assertEqual(round_shard_index_hashes([0, 1]), [0, 1])

    def test_two_round_to_multiple_of_2(self):
        # [0, 256]: (0>>8)=0, (256>>8)=1, so k=8 works. Result [0, 256].
        # [100, 356]: (100>>8)=0, (356>>8)=1, so k=8 works. Result [0, 256].
        self.assertEqual(round_shard_index_hashes([0, 256]), [0, 256])
        self.assertEqual(round_shard_index_hashes([0, 256, 257]), [0, 256, 257])
        self.assertEqual(round_shard_index_hashes([100, 356]), [0, 256])

    def test_three_round_max_k(self):
        # [0, 256, 512]: all multiples of 256, so k=8 works. Result unchanged.
        self.assertEqual(
            round_shard_index_hashes([0, 256, 512]),
            [0, 256, 512],
        )
        # [0, 100, 512]: k=6 works (0>>6=0, 100>>6=1, 512>>6=8). Rounded to multiples of 64: [0, 64, 512].
        self.assertEqual(
            round_shard_index_hashes([0, 100, 512]),
            [0, 64, 512],
        )

    def test_strictly_increasing_preserved(self):
        starts = [0, 65536, 131072, 200000]
        out = round_shard_index_hashes(starts)
        self.assertLess(out[0], out[1])
        self.assertLess(out[1], out[2])
        self.assertLess(out[2], out[3])
        # 0, 65536, 131072, 200000 -> shifted right by 16: 0, 1, 2, 3. So k=16 works.
        # Rounded: 0, 65536, 131072, 196608 (200000 rounded down to multiple of 65536)
        self.assertEqual(out, [0, 65536, 131072, 196608])

    def test_32bit_boundary(self):
        # Values near 2^31: ensure we don't break ordering and mask to 32 bits
        lo, mid, hi = 0x7FFFFF00, 0x80000056, 0x80000101
        out = round_shard_index_hashes([lo, mid, hi])
        self.assertEqual(out, [0, 0x80000000, 0x80000100])

    def test_no_cascade(self):
        self.assertEqual(round_shard_index_hashes([0x064, 0x31c, 0x36e]), [0x000, 0x200, 0x340])

    @parameterized.expand([(i,) for i in range(1000)])
    def test_fuzz_strictly_increasing_and_rounded(self, seed):
        """Fuzz: random strictly-increasing lists; output must be strictly increasing and each out[i] <= starts[i]."""
        import random

        random.seed(seed)
        result = [random.randint(0, 100)]
        for _ in range(1, 1000):
            result.append(result[-1] + random.randint(1, 1000))
        starts = result
        print(", ".join(f"0x{v:x}" for v in starts))
        out = round_shard_index_hashes(starts)
        print(", ".join(f"0x{v:x}" for v in out))
        for current_out, next_out in zip(out, out[1:]):
            self.assertLess(current_out, next_out)
        for current_i, next_out in zip(starts, out[1:]):
            self.assertLess(current_i, next_out)
