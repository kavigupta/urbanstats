"""
Unit tests for TOTPManager class.
"""

import datetime
import unittest

from ci_api.src.totp_counter import TOTPCounter


class TestTOTPCounter(unittest.TestCase):
    def test_intermittent_code_generation(self) -> None:
        manager = TOTPCounter()

        first = manager.next_timestamp(100)

        second = manager.next_timestamp(1000)

        self.assertEqual(first, 90)
        self.assertEqual(second, 990)

    def test_concurrent_code_generation(self) -> None:
        """Test behavior when generating multiple codes in quick succession."""

        manager = TOTPCounter()

        # Generate multiple codes quickly
        results = []
        for _ in range(5):
            results.append(manager.next_timestamp(datetime.datetime.now().timestamp()))

        # useAfter timestamps should be increasing
        self.assertEqual(
            results,
            sorted(results),
            "useAfter times should be increasing",
        )
