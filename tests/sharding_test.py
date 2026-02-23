import unittest

import numpy as np
from parameterized import parameterized

from urbanstats.website_data.shard_index_rounding import round_shard_index_hashes


class TestRoundShardIndexHashes(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(round_shard_index_hashes([]), [])

    def test_single(self):
        self.assertEqual(round_shard_index_hashes([(0, 0)]), [0])
        self.assertEqual(round_shard_index_hashes([(0x12345678, 0x12345678)]), [0])

    def test_two_no_rounding_possible(self):
        # Buckets (0,0) and (1,1): rounded[1] must be > 0 and <= 1, so 1.
        self.assertEqual(round_shard_index_hashes([(0, 0), (1, 1)]), [0, 1])

    def test_two_round_to_multiple_of_2(self):
        self.assertEqual(round_shard_index_hashes([(0, 253), (257, 257)]), [0, 256])
        self.assertEqual(round_shard_index_hashes([(0, 256), (257, 257)]), [0, 257])
        # Buckets (100, 200) and (356, 400): rounded[1] > 200, (356>>8)<<8 = 256.
        self.assertEqual(round_shard_index_hashes([(100, 200), (356, 400)]), [0, 256])

    def test_three_round_max_k(self):
        # (0, 99), (100, 199), (512, 600): rounded[1] > 99 -> 100; rounded[2] > 199, 512 is already multiple of 256.
        self.assertEqual(
            round_shard_index_hashes([(0, 43), (100, 199), (512, 600)]),
            [0, 64, 512],
        )

    def test_strictly_increasing_preserved(self):
        buckets = [(0, 1000), (65536, 100000), (131072, 150000), (200000, 250000)]
        out = round_shard_index_hashes(buckets)
        self.assertLess(out[0], out[1])
        self.assertLess(out[1], out[2])
        self.assertLess(out[2], out[3])
        # rounded[1] > 1000: 65536; rounded[2] > 100000: 131072; rounded[3] > 150000: 196608
        self.assertEqual(out, [0, 65536, 131072, 196608])

    def test_32bit_boundary(self):
        buckets = [
            (0x7FFFFF00, 0x7FFFFFFF),
            (0x80000056, 0x80000099),
            (0x80000101, 0x80000200),
        ]
        out = round_shard_index_hashes(buckets)
        self.assertEqual(out, [0, 0x80000000, 0x80000100])
        for v in out:
            self.assertLessEqual(v, 0xFFFFFFFF)

    def test_no_cascade(self):
        # Each rounded value must be > previous bucket's end.
        buckets = [(0x035, 0x64), (0x31B, 0x31C), (0x36E, 0x400)]
        out = round_shard_index_hashes(buckets)
        self.assertEqual(out, [0, 0x200, 0x340])

    @parameterized.expand([(i,) for i in range(1000)])
    def test_fuzz_strictly_increasing_and_rounded(self, seed):
        """Fuzz: random strictly-increasing lists; output must be strictly increasing and each out[i] <= starts[i]."""
        rng = np.random.default_rng(seed)
        starts_ends = np.sort(rng.integers(0, 0xFFFFFFFF, size=200))
        starts, end = starts_ends.reshape(-1, 2).T
        buckets = list(zip(starts, end))
        out = round_shard_index_hashes(buckets)
        # Outputs must be strictly increasing.
        for i in range(1, len(out)):
            self.assertLess(out[i - 1], out[i])
        # Each out[i] must be <= starts[i].
        for i in range(len(out)): # pylint: disable=consider-using-enumerate
            self.assertLessEqual(out[i], starts[i])
        # Each out[i] must be > end[i-1] (except i=0).
        for i in range(1, len(out)):
            self.assertGreater(out[i], end[i - 1])
