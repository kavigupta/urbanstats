export type QuizDescriptor = { kind: "juxtastat", name: number } | { kind: "retrostat", name: string }

export const ENDPOINT = "https://persistent.urbanstats.org";

export interface JuxtaQuestion { kind: "juxtastat", stat_a: number, stat_b: number, question: string, longname_a: string, longname_b: string, stat_column: string }
export interface RetroQuestion { kind: "retrostat", a_ease: number, b_ease: number, a: JuxtaQuestion, b: JuxtaQuestion }
export type QuizQuestion = JuxtaQuestion | RetroQuestion

export function a_correct(quiz: QuizQuestion): boolean {
    switch (quiz.kind) {
    case "juxtastat":
        return quiz.stat_a > quiz.stat_b;
    case "retrostat":
        return quiz.a_ease > quiz.b_ease;
    }
}

export function nameOfQuizKind(quiz_kind: "juxtastat" | "retrostat") {
    return quiz_kind.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}
