export const generateShortCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'LOC-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const buildFullName = (areaName, furnitureName, containerName, slotName) => {
  const parts = [areaName, furnitureName, containerName, slotName].filter(Boolean);
  return parts.join(' › ');
};