from collections import defaultdict
import sys

from urbanstats.games.quiz_analysis import get_full_statistics

users = [int(x) for x in sys.argv[1:]]

result = get_full_statistics(after_problem=1, debug=False)
result_for_user = result[result.user_id.apply(lambda x: x in users)]

problem_to_patterns = defaultdict(list)
for problem, pattern in zip(result_for_user.problem, result_for_user.pattern):
    problem_to_patterns[problem].append(pattern)

problem_to_pattern = {
    problem: min(patterns, key=sum)
    for problem, patterns in problem_to_patterns.items()
}

out = []
for problem, pattern in problem_to_pattern.items():
    out.append([problem, "".join(str(t) for t in pattern.tolist())])
out = str(out).replace(" ", "")
code = (
    f"localStorage['persistent_id'] = {hex(users[0])[2:]!r};"
    f"var x = {out}; y = {{}};"
    f"for(a of x) {{y[a[0]] = {{'correct_pattern': a[1].split('').map(x => parseInt(x)), 'choices': ['A', 'A', 'A', 'A', 'A']}}}};"
    f"localStorage['quiz_history'] = JSON.stringify(y);"
    f"void(0)"
)
print("javascript:" + code)
