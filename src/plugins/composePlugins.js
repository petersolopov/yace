function composePlugins(plugins, event, options) {
  const { value, selectionStart, selectionEnd } = event.target;

  return plugins.reduce(
    (acc, plugin) => {
      return {
        ...acc,
        ...plugin(acc, event, options),
      };
    },
    { value, selectionStart, selectionEnd }
  );
}

export default composePlugins;
