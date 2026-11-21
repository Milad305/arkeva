import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/network/network_info.dart';

/// وضعیت اتصال سراسری (rules ۶.۱)؛ در `app.dart` فراهم می‌شود.
@lazySingleton
class ConnectivityCubit extends Cubit<NetworkKind> {
  ConnectivityCubit(this._network) : super(NetworkKind.wifi) {
    unawaited(_network.current().then((kind) => isClosed ? null : emit(kind)));
    _subscription = _network.changes.listen(emit);
  }

  final NetworkInfo _network;
  late final StreamSubscription<NetworkKind> _subscription;

  @override
  Future<void> close() async {
    await _subscription.cancel();
    return super.close();
  }
}
