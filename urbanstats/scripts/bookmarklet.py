import sys

from urbanstats.games.quiz_analysis import get_full_statistics

user = int(sys.argv[1])

result = get_full_statistics(after_problem=1, debug=False)
result_for_user = result[result.user_id == user]
out = []
for problem, pattern in zip(result_for_user.problem, result_for_user.pattern):
    out.append([problem, "".join(str(t) for t in pattern.tolist())])
out = str(out).replace(" ", "")
code = (
    f"localStorage['persistent_id'] = {hex(user)[2:]!r};"
    f"var x = {out}; y = {{}};"
    f"for(a of x) {{y[a[0]] = {{'correct_pattern': a[1].split('').map(x => parseInt(x)), 'choices': ['A', 'A', 'A', 'A', 'A']}}}};"
    f"localStorage['quiz_history'] = JSON.stringify(y);"
    f"void(0)"
)
print(len(code))
