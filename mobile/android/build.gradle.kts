allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
// پلاگین‌ها نسخهٔ AGP خودشان را در buildscript می‌خواهند؛ همه را به نسخهٔ پروژه (settings.gradle.kts) می‌بندیم تا
// build به دسترسی دوبارهٔ Google Maven برای نسخه‌های دیگر وابسته نباشد.
val projectAgpVersion = "8.9.1"
subprojects {
    buildscript {
        configurations.configureEach {
            resolutionStrategy.eachDependency {
                if (requested.group == "com.android.tools.build" && requested.name == "gradle") {
                    useVersion(projectAgpVersion)
                }
            }
        }
    }
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
