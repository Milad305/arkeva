import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:projeyar_field/app/router/routes.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/features/notifications/domain/entities/notification_entities.dart';
import 'package:projeyar_field/features/notifications/presentation/bloc/notifications_bloc.dart';
import 'package:projeyar_field/features/notifications/presentation/notification_links.dart';

/// M12 اعلان‌ها.
class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context) => BlocBuilder<NotificationsBloc, NotificationsState>(
    builder: (context, state) {
      final bloc = context.read<NotificationsBloc>();
      return Scaffold(
        appBar: AppBar(
          title: Text(state.unreadCount > 0 ? 'اعلان‌ها (${toFaDigits(state.unreadCount)})' : 'اعلان‌ها'),
          actions: [
            if (state.unreadCount > 0 && !state.stale)
              TextButton(onPressed: () => bloc.add(const NotificationsAllRead()), child: const Text('خواندن همه')),
          ],
        ),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsetsDirectional.symmetric(horizontal: AppSpace.s16, vertical: AppSpace.s8),
              child: Row(
                children: [
                  ChoiceChip(label: const Text('همه'), selected: !state.unreadOnly, onSelected: (_) => bloc.add(const NotificationsUnreadOnlyToggled(value: false))),
                  const SizedBox(width: AppSpace.s8),
                  ChoiceChip(label: const Text('نخوانده'), selected: state.unreadOnly, onSelected: (_) => bloc.add(const NotificationsUnreadOnlyToggled(value: true))),
                ],
              ),
            ),
            if (state.stale && state.failure != null)
              Padding(
                padding: const EdgeInsetsDirectional.symmetric(horizontal: AppSpace.s16),
                child: FailureBanner(failure: state.failure!, onRetry: () => bloc.add(const NotificationsRefreshed())),
              ),
            Expanded(
              child: state.status == NotificationsStatus.loading
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: () async {
                        bloc.add(const NotificationsRefreshed());
                        await bloc.stream.firstWhere((s) => s.status == NotificationsStatus.ready);
                      },
                      child: state.items.isEmpty
                          ? ListView(children: const [SizedBox(height: 120), EmptyState(title: 'اعلانی نیست', icon: Icons.notifications_none)])
                          : NotificationListener<ScrollNotification>(
                              onNotification: (n) {
                                if (n.metrics.extentAfter < 300 && state.nextCursor != null) bloc.add(const NotificationsMoreRequested());
                                return false;
                              },
                              child: ListView.separated(
                                itemCount: state.items.length + (state.status == NotificationsStatus.loadingMore ? 1 : 0),
                                separatorBuilder: (_, _) => const Divider(height: 1),
                                itemBuilder: (context, i) => i >= state.items.length
                                    ? const Padding(padding: EdgeInsets.all(AppSpace.s16), child: Center(child: CircularProgressIndicator()))
                                    : _Tile(item: state.items[i]),
                              ),
                            ),
                    ),
            ),
          ],
        ),
      );
    },
  );
}

class _Tile extends StatelessWidget {
  const _Tile({required this.item});

  final AppNotification item;

  @override
  Widget build(BuildContext context) {
    final route = NotificationLinks.route(item.link, revision: Routes.revisionOf, reports: Routes.reports);
    return ListTile(
      tileColor: item.isRead ? null : AppColors.primary100.withValues(alpha: 0.4),
      leading: Icon(
        item.severity == 'critical' || item.severity == 'high' ? Icons.priority_high : Icons.notifications_outlined,
        color: item.isRead ? AppColors.gray400 : AppColors.primary700,
      ),
      title: Text(item.title, style: item.isRead ? AppText.ui : AppText.subheading),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (item.body != null) Text(item.body!, style: AppText.bodySm, maxLines: 3, overflow: TextOverflow.ellipsis),
          Text(
            [
              ?item.projectName,
              JalaliFormat.moment(item.createdAt),
              if (item.mergedCount > 1) '${toFaDigits(item.mergedCount)} مورد',
            ].join(' · '),
            style: AppText.caption.copyWith(color: AppColors.gray500),
          ),
        ],
      ),
      onTap: () {
        context.read<NotificationsBloc>().add(NotificationOpened(item.id));
        if (route != null) unawaited(context.push(route));
      },
    );
  }
}
