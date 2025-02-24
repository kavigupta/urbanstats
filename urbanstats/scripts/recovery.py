import json
import sys
from collections import defaultdict
from datetime import datetime

from urbanstats.games.quiz_analysis import get_full_statistics, get_secure_id_for_user

users = [int(x) for x in sys.argv[1:]]

result = get_full_statistics(after_problem=1, debug=False)
result_for_user = result[result.user_id.apply(lambda x: x in users)]

print(len(result_for_user), "records")

problem_to_patterns = defaultdict(list)
for problem, pattern in zip(result_for_user.problem, result_for_user.pattern):
    problem_to_patterns[problem].append(pattern)

problem_to_pattern = {
    problem: min(patterns, key=sum) for problem, patterns in problem_to_patterns.items()
}

out = []
for problem, pattern in problem_to_pattern.items():
    out.append([problem, [bool(t) for t in pattern.tolist()]])

secure = get_secure_id_for_user(users[0])

history_file = dict(
    date_exported=datetime.now().isoformat(),
    persistent_id=hex(users[0])[2:],
    secure_id=hex(secure)[2:],
    quiz_history={str(k): {"choices": ["A"] * 5, "correct_pattern": v} for k, v in out},
    quiz_friends=[],
)

with open("out.json", "w") as f:
    json.dump(history_file, f)
