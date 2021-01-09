import type {Config} from '@jest/types';

// Sync object
const config: Config.InitialOptions = {
	moduleFileExtensions: ["json", "ts", "tsx", "node", "js", "jsx"],
	"testMatch": ["**/?(*.)+(spec|test).[t]s?(x)"],
	testEnvironment: "node"
};

export default config;
