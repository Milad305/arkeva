import 'package:flutter/material.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';

/// تم روشن اپ. رنگ اقدام فقط primary-700؛ تأیید success-700 (CLAUDE.md ۵).
abstract final class AppTheme {
  static ThemeData light() {
    const scheme = ColorScheme(
      brightness: Brightness.light,
      primary: AppColors.primary700,
      onPrimary: AppColors.gray0,
      primaryContainer: AppColors.primary100,
      onPrimaryContainer: AppColors.primary900,
      secondary: AppColors.accent500,
      onSecondary: AppColors.gray0,
      secondaryContainer: AppColors.accent100,
      onSecondaryContainer: AppColors.accent700,
      error: AppColors.error700,
      onError: AppColors.gray0,
      errorContainer: AppColors.error50,
      onErrorContainer: AppColors.error700,
      surface: AppColors.gray0,
      onSurface: AppColors.gray900,
      onSurfaceVariant: AppColors.gray600,
      surfaceContainerLowest: AppColors.gray0,
      surfaceContainerLow: AppColors.gray50,
      surfaceContainer: AppColors.gray100,
      outline: AppColors.gray300,
      outlineVariant: AppColors.gray200,
    );
    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppRadius.md),
      borderSide: const BorderSide(color: AppColors.gray300),
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: AppFonts.sans,
      scaffoldBackgroundColor: AppColors.gray50,
      textTheme: const TextTheme(
        displaySmall: AppText.display,
        headlineSmall: AppText.title1,
        titleLarge: AppText.title2,
        titleMedium: AppText.title3,
        titleSmall: AppText.subheading,
        bodyLarge: AppText.body,
        bodyMedium: AppText.bodySm,
        bodySmall: AppText.caption,
        labelLarge: AppText.ui,
        labelMedium: AppText.label,
        labelSmall: AppText.caption,
      ).apply(bodyColor: AppColors.gray900, displayColor: AppColors.gray900),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.gray0,
        foregroundColor: AppColors.gray900,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
        titleTextStyle: TextStyle(fontFamily: AppFonts.sans, fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.gray900),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.gray0,
        contentPadding: const EdgeInsetsDirectional.symmetric(horizontal: AppSpace.s12, vertical: AppSpace.s12),
        border: border,
        enabledBorder: border,
        focusedBorder: border.copyWith(borderSide: const BorderSide(color: AppColors.primary500, width: 1.5)),
        errorBorder: border.copyWith(borderSide: const BorderSide(color: AppColors.error500)),
        focusedErrorBorder: border.copyWith(borderSide: const BorderSide(color: AppColors.error500, width: 1.5)),
        labelStyle: AppText.ui.copyWith(color: AppColors.gray600),
        floatingLabelStyle: AppText.ui.copyWith(color: AppColors.primary700),
        helperStyle: AppText.caption.copyWith(color: AppColors.gray500),
        errorStyle: AppText.caption.copyWith(color: AppColors.error700),
        hintStyle: AppText.bodySm.copyWith(color: AppColors.gray400),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary700,
          foregroundColor: AppColors.gray0,
          disabledBackgroundColor: AppColors.gray200,
          disabledForegroundColor: AppColors.gray500,
          minimumSize: const Size.fromHeight(AppSize.control),
          textStyle: AppText.ui.copyWith(fontWeight: FontWeight.w600, fontSize: 15),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary700,
          minimumSize: const Size.fromHeight(AppSize.control),
          side: const BorderSide(color: AppColors.gray300),
          textStyle: AppText.ui.copyWith(fontWeight: FontWeight.w600, fontSize: 15),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: AppColors.primary700, textStyle: AppText.ui.copyWith(fontWeight: FontWeight.w600)),
      ),
      cardTheme: CardThemeData(
        color: AppColors.gray0,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          side: const BorderSide(color: AppColors.gray200),
        ),
      ),
      dividerTheme: const DividerThemeData(color: AppColors.gray200, space: 1, thickness: 1),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.gray900,
        contentTextStyle: AppText.bodySm.copyWith(color: AppColors.gray0),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.gray0,
        indicatorColor: AppColors.primary100,
        labelTextStyle: WidgetStatePropertyAll(AppText.caption.copyWith(fontWeight: FontWeight.w600)),
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? AppColors.primary700 : null),
      ),
      sliderTheme: const SliderThemeData(activeTrackColor: AppColors.primary700, thumbColor: AppColors.primary700),
    );
  }
}
