module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  moduleNameMapper: {
    '^@renderer/(.*)$': '<rootDir>/src/renderer/src/$1',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/jest.fileMock.js',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
  },
  testPathIgnorePatterns: ['release/app/dist', '.erb/dll', 'node_modules'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          moduleResolution: 'node',
          baseUrl: '.',
          paths: {
            '@renderer/*': ['src/renderer/src/*'],
          },
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(yaml|uuid)/)'],
}
