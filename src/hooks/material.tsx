/* eslint-disable no-console */
import React, { createContext, useContext } from 'react';

import { Material } from '../types';

interface MaterialContext {
  createMaterial: (newMaterialData: Material) => void;
}

const MaterialContext = createContext<MaterialContext>({} as MaterialContext);

export const MaterialProvider: React.FC = ({ children }) => {
  const createMaterial = async (newMaterialData: Material) => {
    console.log(newMaterialData);
  };

  return (
    <MaterialContext.Provider value={{ createMaterial }}>
      {children}
    </MaterialContext.Provider>
  );
};

export function useMaterial(): MaterialContext {
  const context = useContext(MaterialContext);

  if (!context) {
    throw new Error('useMaterial must be used within an AuthProvider');
  }

  return context;
}
