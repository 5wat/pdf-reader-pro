import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileEdit,
  Square,
  Signature,
  Download,
  Moon,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  selector?: string;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  const steps: TourStep[] = [
    {
      id: 'welcome',
      title: 'Ласкаво просимо до ProPDF free!',
      description:
        'Швидкий, зручний та повністю безкоштовний редактор PDF-файлів у вашому браузері. Давайте за 30 секунд поглянемо на ключові можливості програми.',
      icon: <Sparkles className="w-8 h-8 text-amber-500" />,
    },
    {
      id: 'edit-text',
      title: 'Редагування тексту як у Word',
      description:
        'Оберіть інструмент «Редагувати вміст» (або клавішу E) і клікніть на будь-який наявний текст у PDF. Оригінал надійно маскується кольором тла, а ви можете вводити новий текст, змінювати шрифт, колір та вільно розширювати розмір блоку маркерами.',
      icon: <FileEdit className="w-8 h-8 text-blue-500" />,
      selector: '#tool-editText',
    },
    {
      id: 'shapes',
      title: 'Фігури, Лінії та Стрілки',
      description:
        'Малюйте лінії та стрілки простим перетягуванням від точки А до точки В. Для прямокутників та кіл доступні як прозорість, так і вибір будь-якого кастомного кольору контуру та заливки.',
      icon: <Square className="w-8 h-8 text-indigo-500" />,
      selector: '#tool-shape',
    },
    {
      id: 'signatures-stamps',
      title: 'Електронні підписи та Штампи',
      description:
        'Додавайте підписи від руки (малювання мишею/стилусом), завантажуйте зображення підпису або створюйте каліграфічні підписи. Також доступні офіційні штампи «ЗАТВЕРДЖЕНО», «СПЛАЧЕНО», «КОПІЯ ВІРНА» тощо.',
      icon: <Signature className="w-8 h-8 text-purple-500" />,
      selector: '#tool-signature',
    },
    {
      id: 'pages-and-theme',
      title: 'Сторінки, Дві теми та Експорт',
      description:
        'Керуйте сторінками в лівій панелі з реальними живими превʼю. Перемикайте темну та світлу тему у верхньому правому кутку. Коли все готово — натискайте «Зберегти PDF» для бездоганного експорту з підтримкою української мови.',
      icon: <Download className="w-8 h-8 text-emerald-500" />,
      selector: '#header-save-btn',
    },
  ];

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('propdf_onboarding_completed', 'true');
    onClose();
  };

  return (
    <div
      onClick={handleFinish}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 cursor-pointer animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col transition-all cursor-default relative ring-1 ring-white/10"
      >
        {/* Close Button */}
        <button
          onClick={handleFinish}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
          title="Закрити тур"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Box */}
        <div className="p-7 flex flex-col items-center text-center">
          {/* Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/90 flex items-center justify-center mb-5 shadow-inner border border-slate-200/80 dark:border-slate-700/80">
            {step.icon}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2.5 tracking-tight">
            {step.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md">
            {step.description}
          </p>

          {/* Dots Indicator */}
          <div className="flex items-center space-x-1.5 mt-6 mb-2">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-6 bg-blue-600 dark:bg-blue-500'
                    : 'w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
                title={`Перейти до кроку ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
          <button
            onClick={handleFinish}
            className="text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            Пропустити
          </button>

          <div className="flex items-center space-x-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-500/20 transition-all"
            >
              {isLast ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Розпочати роботу!</span>
                </>
              ) : (
                <>
                  <span>Далі</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
