import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';

const detectedJdk = process.env.ProgramFiles
  ? [...(await import('node:fs/promises')).readdir(`${process.env.ProgramFiles}/Microsoft`, { withFileTypes: true }).catch(() => [])]
      .find((entry) => entry.isDirectory() && entry.name.startsWith('jdk-17'))
  : null;
const javaHome = process.env.JAVA_HOME || (detectedJdk
  ? `${process.env.ProgramFiles}/Microsoft/${detectedJdk.name}`
  : null);
if (!javaHome) {
  console.error('JAVA_HOME is not set. Install JDK 17 and set JAVA_HOME before building the APK.');
  process.exit(1);
}
process.env.JAVA_HOME = javaHome;

const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const gradlePath = `android/${gradle}`;
if (!existsSync(gradlePath)) {
  console.error(`Android Gradle wrapper not found at ${gradlePath}. Run npx cap add android first.`);
  process.exit(1);
}

try {
  execFileSync(gradlePath, ['assembleDebug'], { stdio: 'inherit', cwd: process.cwd() });
} catch {
  console.error('Android build failed. QueueSense requires a compatible JDK (17 recommended) and Android SDK.');
  process.exit(1);
}