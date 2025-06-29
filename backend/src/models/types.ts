export interface Mission {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  points: number;
}

export interface Chapter {
  chapterId: string;
  title: string;
  missions: Mission[];
}

export interface AnswerRequest {
  chapterId: string;
  missionId: string;
  answer: number;
  timestamp: number;
}

export interface AnswerResponse {
  correct: boolean;
  score: number;
  timeBonus: number;
  correctAnswer: number;
}