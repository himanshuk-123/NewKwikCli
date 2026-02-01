import { AppStepListDataRecord } from '../features/valuation/types';

/**
 * Process questions from backend API response
 * Mirrors Expo behavior: special steps split questions, others replace "~" with "/"
 */
const TO_SPLIT_QUESTION = [
  'odometer reading',
  'chassis imprint image',
  'odmeter reading',
];

const questionHandler = (questionData: AppStepListDataRecord): null | string | string[] => {
  const question = questionData?.Questions as string | string[] | null | undefined;

  if (!question) {
    return null;
  }

  const stepName = (questionData?.Name || '').toLowerCase();

  if (TO_SPLIT_QUESTION.includes(stepName)) {
    if (typeof question === 'string') {
      return question.replaceAll('~', '/').split('/');
    }
    return Array.isArray(question)
      ? question.map((item) => item.replaceAll('~', '/'))
      : question;
  }

  // Check if "NO question" - means skip this side
  if (typeof question === 'string' && question.includes('NO question')) {
    return null;
  }

  if (Array.isArray(question)) {
    return question.map(item => item.replaceAll('~', '/'));
  }

  return typeof question === 'string' ? question.replaceAll('~', '/') : question;
};

interface GetSideQuestionProps {
  data: AppStepListDataRecord[];
  vehicleType: string;
  nameInApplication: string;
}

const useQuestions = () => {
  /**
   * Get sides that require images for a specific vehicle type
   */
  const getSides = (
    data: AppStepListDataRecord[],
    vehicleType: string
  ): string[] => {
    if (!vehicleType) return [];

    const sides = data
      .filter(
        (item) =>
          item.VehicleType?.toUpperCase() === vehicleType.toUpperCase() &&
          item.Images === true
      )
      .map((item) => item.Name || '');

    return sides;
  };

  /**
   * Get question data for a specific side
   * @param data - Full AppStepList from backend
   * @param vehicleType - Vehicle type (2W, 3W, 4W, etc.)
   * @param nameInApplication - Name of the side (e.g., "Odometer Reading", "Front Side")
   * @returns Processed question data or null if no questions
   */
  const getSideQuestion = ({
    data,
    vehicleType,
    nameInApplication,
  }: GetSideQuestionProps): (AppStepListDataRecord & { ProcessedQuestions: null | string | string[] }) | null => {
    if (!vehicleType || !nameInApplication) return null;

    // Find the matching step from backend data
    const questionData = data.find(
      (item: any) => item.Name === nameInApplication
    );

    if (!questionData) return null;

    // Process the questions field (match Expo behavior)
    const processedQuestions = questionHandler(questionData);
    const processed = {
      ...questionData,
      Questions: processedQuestions as any,
      ProcessedQuestions: processedQuestions,
    };

    return processed;
  };

  return { getSides, getSideQuestion };
};

export default useQuestions;
