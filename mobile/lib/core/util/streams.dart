import 'dart:async';

/// ترکیب آخرین مقدار چند Stream؛ پس از رسیدن مقدار اول همه، با هر تغییر یک خروجی.
/// جایگزین کوچک rxdart تا بستهٔ تازه لازم نشود.
Stream<R> combineLatestList<R>(List<Stream<Object?>> streams, R Function(List<Object?> values) combine) {
  late StreamController<R> controller;
  final subscriptions = <StreamSubscription<Object?>>[];
  controller = StreamController<R>(
    onListen: () {
      final values = List<Object?>.filled(streams.length, null);
      final seen = List<bool>.filled(streams.length, false);
      var done = 0;
      for (var i = 0; i < streams.length; i++) {
        subscriptions.add(
          streams[i].listen(
            (value) {
              values[i] = value;
              seen[i] = true;
              if (seen.every((s) => s)) controller.add(combine(List.unmodifiable(values)));
            },
            onError: controller.addError,
            onDone: () {
              if (++done == streams.length) unawaited(controller.close());
            },
          ),
        );
      }
    },
    onPause: () {
      for (final s in subscriptions) {
        s.pause();
      }
    },
    onResume: () {
      for (final s in subscriptions) {
        s.resume();
      }
    },
    onCancel: () => Future.wait(subscriptions.map((s) => s.cancel())),
  );
  return controller.stream;
}

Stream<R> combineLatest2<A, B, R>(Stream<A> a, Stream<B> b, R Function(A a, B b) combine) =>
    combineLatestList<R>([a, b], (v) => combine(v[0] as A, v[1] as B));

Stream<R> combineLatest3<A, B, C, R>(Stream<A> a, Stream<B> b, Stream<C> c, R Function(A a, B b, C c) combine) =>
    combineLatestList<R>([a, b, c], (v) => combine(v[0] as A, v[1] as B, v[2] as C));

/// اول `first`، سپس رویدادهای `source` (مثل وضعیت فعلی شبکه پیش از تغییرها).
Stream<T> startWith<T>(Stream<T> source, T first) async* {
  yield first;
  yield* source;
}
