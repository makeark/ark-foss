import "./sidebar.less";
import { VscDatabase } from "react-icons/vsc";
import React, { FC, useCallback, useEffect, useState } from "react";
import { dispatch, listenEffect } from "../../util/events";

type SidebarItem = Pick<Ark.StoredConnection, "id" | "name">;

export const Sidebar: FC = () => {
	const [items, setItems] = useState<SidebarItem[]>([]);

	const listConnections = useCallback(() => {
		dispatch("connection_manager:toggle");
	}, []);

	const switchConnections = useCallback((connectionId: string) => {
		dispatch("explorer:switch_connections", { connectionId });
	}, []);

	const addItem = useCallback((item: SidebarItem) => {
		setItems((items) => [...items, item]);
	}, []);

	const removeItem = useCallback((id: string) => {
		setItems((items) => items.filter((conn) => conn.id !== id));
	}, []);

	useEffect(
		() =>
			listenEffect([
				{
					event: "sidebar:add_item",
					cb: (e, payload) => addItem(payload),
				},
				{
					event: "sidebar:remove_item",
					cb: (e, payload) => removeItem(payload),
				},
			]),
		[addItem, removeItem]
	);

	return (
		<div className="Sidebar">
			<div className="SidebarSection" onClick={listConnections}>
				<VscDatabase size="30" />
			</div>
			<div className="SidebarSection">
				{items?.map((conn) => (
					<div key={conn.id} onClick={() => switchConnections(conn.id)}>
						{conn.name[0]}
					</div>
				))}
			</div>
		</div>
	);
};