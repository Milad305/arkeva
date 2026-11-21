import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/features/issues/domain/entities/issue_entities.dart';
import 'package:projeyar_field/features/issues/domain/repositories/issues_repository.dart';

/// فهرست مشکل‌های کارگاه (گوشی و سرور). حالت سادهٔ بی‌رویداد ← Cubit (rules ۱).
@injectable
class IssuesListCubit extends Cubit<List<SiteIssue>?> {
  IssuesListCubit(this._repository) : super(null) {
    _subscription = _repository.watchIssues().listen(emit);
  }

  final IssuesRepository _repository;
  late final StreamSubscription<List<SiteIssue>> _subscription;

  @override
  Future<void> close() async {
    await _subscription.cancel();
    return super.close();
  }
}
