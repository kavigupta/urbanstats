class TOTPCounter:

    current_iteration: int

    def __init__(self, totp_interval: int = 30):
        self.current_iteration = 0
        self.totp_interval = totp_interval

    def next_timestamp(self, after_timestamp: float) -> float:

        # Calculate the current iteration based on TOTP interval
        iteration_now = round(after_timestamp // self.totp_interval)

        # Ensure we always generate a code for a future iteration
        self.current_iteration = max(iteration_now, self.current_iteration + 1)

        use_after = self.current_iteration * self.totp_interval

        return use_after
