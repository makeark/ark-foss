import "./Button.less";

import React, { FC, useState, useMemo } from "react";
import { Button as BPButton, ActionProps, IconName } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import { PromiseCompleteCallback, asyncEventOverload } from "../utils/misc";
import { Popover } from "./Popover";

export interface PromiseButtonMouseEventHandler {
	promise: (e: React.MouseEvent) => Promise<void>;
	callback: PromiseCompleteCallback;
}

interface PopoverOptions {
	content?: React.ReactNode;
	title?: string;
}

export interface ButtonProps {
	variant?: ActionProps["intent"] | "link";
	shape?: "round" | "circle";
	text?: string;
	icon?: IconName;
	size?: "large" | "small";
	disabled?: boolean;
	dropdownOptions?: {
		menu: JSX.Element;
	};
	popoverOptions?: {
		hover?: PopoverOptions;
		click?: PopoverOptions;
	};
	onClick?: ((e: React.MouseEvent) => void) | PromiseButtonMouseEventHandler;
}

export const Button: FC<ButtonProps> = (props) => {
	const {
		icon,
		text,
		onClick,
		popoverOptions,
		dropdownOptions,
		size,
		variant,
		disabled
	} = props;

	const [loading, setLoading] = useState(false);

	const baseButton = useMemo(
		() => (
			<BPButton
				disabled={loading || disabled}
				onClick={(e) => {
					if (!popoverOptions || (popoverOptions && !popoverOptions.click))
						onClick && asyncEventOverload(setLoading, onClick, e);
				}}
				text={text}
				loading={icon ? loading : undefined}
				large={size === "large"}
				small={size === "small"}
				outlined={variant === "link"}
				intent={variant !== "link" ? variant : undefined}
				icon={icon ? icon : undefined}
			/>
		),
		[disabled, icon, loading, onClick, popoverOptions, size, text, variant]
	);

	const buttonWithPopovers = useMemo(
		() =>
			popoverOptions
				? Object.keys(popoverOptions).reduce((children, trigger) => {
						const options = popoverOptions[trigger];
						return options ? (
							<Popover
								trigger={trigger as "click" | "hover"}
								content={options.content}
								title={options.title}
							>
								{React.Children.toArray(children)}
							</Popover>
						) : (
							React.cloneElement(children)
						);
				  }, baseButton)
				: baseButton,
		[baseButton, popoverOptions]
	);

	const buttonWithPopoversAndDropdown = useMemo(
		() =>
			dropdownOptions ? (
				<Popover2 content={dropdownOptions.menu}>{buttonWithPopovers}</Popover2>
			) : (
				baseButton
			),
		[baseButton, buttonWithPopovers, dropdownOptions]
	);

	return buttonWithPopoversAndDropdown;
};
