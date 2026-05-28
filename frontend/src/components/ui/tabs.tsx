import React, { useState, ReactNode } from 'react';

interface TabsProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({ value: '', onValueChange: () => {} });

const Tabs: React.FC<TabsProps> = ({ value = '', onValueChange = () => {}, children }) => {
  const [internalValue, setInternalValue] = useState(value);
  const currentValue = value || internalValue;
  
  const handleChange = (newValue: string) => {
    setInternalValue(newValue);
    onValueChange(newValue);
  };
  
  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleChange }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
};

const TabsList: React.FC<TabsListProps> = ({ children, className = '' }) => (
  <div className={`flex border-b border-slate-700 ${className}`}>
    {children}
  </div>
);

const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, className = '' }) => {
  const { value: currentValue, onValueChange } = React.useContext(TabsContext);
  const isActive = currentValue === value;
  
  return (
    <button
      onClick={() => onValueChange(value)}
      className={`px-4 py-2 font-medium text-sm transition-colors ${
        isActive
          ? 'text-white border-b-2 border-blue-500'
          : 'text-gray-400 hover:text-white'
      } ${className}`}
    >
      {children}
    </button>
  );
};

const TabsContent: React.FC<TabsContentProps> = ({ value, children, className = '' }) => {
  const { value: currentValue } = React.useContext(TabsContext);
  
  if (currentValue !== value) return null;
  
  return <div className={className}>{children}</div>;
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
