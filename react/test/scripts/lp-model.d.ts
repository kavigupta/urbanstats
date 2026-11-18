declare module 'lp-model' {
    interface Var { value: number }
    type Constr = (Var | [number, Var])[] | number

    class Model {
        constructor()

        addVar(p: { vtype: 'BINARY' }): Var

        addConstr(c1: Constr, rel: '<=' | '==', c2: Constr)

        setObjective(o: Constr, op: 'MINIMIZE')

        toLPFormat(): string

        variables: ReadonlyMap<string, Var>
    }
}
