import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
    drawDate: string;
    size?: 'small' | 'medium' | 'large';
    showLabel?: boolean;
}

export default function CountdownTimer({ 
    drawDate, 
    size = 'medium', 
    showLabel = true 
}: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const drawDateTime = new Date(drawDate).getTime();
            const difference = drawDateTime - now;

            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);

                setTimeLeft({ days, hours, minutes, seconds });
                setIsExpired(false);
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                setIsExpired(true);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [drawDate]);

    const sizeClasses = {
        small: {
            container: 'py-1',
            icon: 'w-3 h-3',
            iconContainer: 'w-6 h-6',
            label: 'text-xs',
            title: 'text-xs',
            time: 'text-xs',
            unit: 'text-xs',
            grid: 'grid-cols-4 gap-1',
            padding: 'p-1'
        },
        medium: {
            container: 'py-6',
            icon: 'w-5 h-5',
            iconContainer: 'w-16 h-16',
            label: 'text-lg',
            title: 'text-2xl',
            time: 'text-xl sm:text-2xl lg:text-3xl',
            unit: 'text-xs sm:text-sm',
            grid: 'grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4',
            padding: 'p-3 sm:p-4'
        },
        large: {
            container: 'py-8',
            icon: 'w-6 h-6',
            iconContainer: 'w-20 h-20',
            label: 'text-xl',
            title: 'text-3xl',
            time: 'text-2xl sm:text-3xl lg:text-4xl',
            unit: 'text-sm sm:text-base',
            grid: 'grid-cols-4 gap-4 sm:gap-6',
            padding: 'p-4 sm:p-6'
        }
    };

    const classes = sizeClasses[size];

    if (isExpired) {
        return (
            <div className={`text-center ${classes.container}`}>
                <div className={`inline-flex items-center justify-center ${classes.iconContainer} bg-red-100 dark:bg-red-900/30 rounded-full mb-4`}>
                    <Clock className={`${classes.icon} text-red-600 dark:text-red-400`} />
                </div>
                <div className={`${classes.title} font-bold text-red-600 dark:text-red-400 mb-2`}>Draw Time!</div>
                <div className="text-gray-600 dark:text-gray-400">The raffle draw is happening now</div>
            </div>
        );
    }

    return (
        <div className={`text-center ${classes.container}`}>
            {showLabel && (
                <div className="flex items-center justify-center mb-6">
                    <Clock className={`${classes.icon} text-purple-600 dark:text-purple-400 mr-2`} />
                    <span className={`${classes.label} font-semibold text-gray-700 dark:text-gray-300`}>
                        {size === 'small' ? 'Draw in:' : 'Draw Countdown'}
                    </span>
                </div>
            )}
            <div className={`grid ${classes.grid} max-w-2xl mx-auto`}>
                <div className={`bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-700 rounded-xl ${classes.padding} shadow-lg hover:shadow-xl transition-all duration-300`}>
                    <div className={`${classes.time} font-bold text-purple-600 dark:text-purple-400 mb-1`}>
                        {String(timeLeft.days).padStart(2, '0')}
                    </div>
                    <div className={`${classes.unit} text-gray-600 dark:text-gray-400 font-medium`}>
                        {size === 'small' ? 'd' : 'Days'}
                    </div>
                </div>
                <div className={`bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 rounded-xl ${classes.padding} shadow-lg hover:shadow-xl transition-all duration-300`}>
                    <div className={`${classes.time} font-bold text-blue-600 dark:text-blue-400 mb-1`}>
                        {String(timeLeft.hours).padStart(2, '0')}
                    </div>
                    <div className={`${classes.unit} text-gray-600 dark:text-gray-400 font-medium`}>
                        {size === 'small' ? 'h' : 'Hours'}
                    </div>
                </div>
                <div className={`bg-white dark:bg-gray-800 border-2 border-green-200 dark:border-green-700 rounded-xl ${classes.padding} shadow-lg hover:shadow-xl transition-all duration-300`}>
                    <div className={`${classes.time} font-bold text-green-600 dark:text-green-400 mb-1`}>
                        {String(timeLeft.minutes).padStart(2, '0')}
                    </div>
                    <div className={`${classes.unit} text-gray-600 dark:text-gray-400 font-medium`}>
                        {size === 'small' ? 'm' : 'Minutes'}
                    </div>
                </div>
                <div className={`bg-white dark:bg-gray-800 border-2 border-orange-200 dark:border-orange-700 rounded-xl ${classes.padding} shadow-lg hover:shadow-xl transition-all duration-300`}>
                    <div className={`${classes.time} font-bold text-orange-600 dark:text-orange-400 mb-1`}>
                        {String(timeLeft.seconds).padStart(2, '0')}
                    </div>
                    <div className={`${classes.unit} text-gray-600 dark:text-gray-400 font-medium`}>
                        {size === 'small' ? 's' : 'Seconds'}
                    </div>
                </div>
            </div>
        </div>
    );
}
