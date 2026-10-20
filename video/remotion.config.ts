import { Config } from '@remotion/cli/config';

// The default Chrome did not launch on this machine in the previous video.
Config.setChromeMode('chrome-for-testing');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
