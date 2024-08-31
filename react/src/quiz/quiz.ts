export type QuizDescriptor = { kind: "juxtastat", name: number } | { kind: "retrostat", name: string }

export const ENDPOINT = "https://persistent.urbanstats.org";

export interface JuxtaQuestionJSON { stat_a: number, stat_b: number, question: string, longname_a: string, longname_b: string, stat_column: string };
export interface JuxtaQuestion extends JuxtaQuestionJSON { kind: "juxtastat" }
export interface RetroQuestionJSON { a_ease: number, b_ease: number, a: JuxtaQuestionJSON, b: JuxtaQuestionJSON };
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

export function load_juxta(quiz: JuxtaQuestionJSON): JuxtaQuestion {
    return { kind: "juxtastat", ...quiz };
}

export function load_retro(quiz: RetroQuestionJSON): RetroQuestion {
    return { kind: "retrostat", a: load_juxta(quiz.a), b: load_juxta(quiz.b), a_ease: quiz.a_ease, b_ease: quiz.b_ease };
}