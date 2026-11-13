// jest.config.js
module.exports = {
  preset: '@react-native/jest-preset',
  testMatch: ['<rootDir>/src/tests/**/*.test.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|immer|@reduxjs/toolkit|redux|redux-thunk|reselect)/)',
  ],
};