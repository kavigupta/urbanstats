# useful for generating regression tests

import numpy as np
from sklearn.linear_model import LinearRegression

x = np.array([[1, 2, 3]]).T

y = [4, 5, 6]

weight = [1, 1, 1]

lr = LinearRegression(fit_intercept=False, positive=True).fit(
    x, y, sample_weight=weight
)

print("Coefficients:\n", lr.coef_)
print("Intercept:\n", lr.intercept_)
print("Score:\n", lr.score(x, y, sample_weight=weight))
print("Residuals:\n", (y - lr.predict(x)).tolist())
