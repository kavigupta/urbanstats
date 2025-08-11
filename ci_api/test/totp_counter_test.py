"""
Unit tests for TOTPManager class.
"""

import unittest

from ci_api.src.totp_counter import TOTPCounter


class TestTOTPCounter(unittest.TestCase):
    def test_intermittent_code_generation(self) -> None:
        counter = TOTPCounter()

        first = counter.next_timestamp(100)

        second = counter.next_timestamp(1000)

        self.assertEqual(first, 90)
        self.assertEqual(second, 990)

    def test_concurrent_code_generation(self) -> None:
        """Test behavior when generating multiple codes in quick succession."""
        counter = TOTPCounter()

        self.assertEqual(counter.next_timestamp(100), 90)
        self.assertEqual(counter.next_timestamp(110), 120)
        self.assertEqual(counter.next_timestamp(115), 150)
        self.assertEqual(counter.next_timestamp(300), 300)
